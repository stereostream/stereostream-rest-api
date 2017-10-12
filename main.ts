import { series, waterfall } from 'async';
import { createLogger } from 'bunyan';
import { get_models_routes, IModelRoute, populateModelRoutes, raise } from 'nodejs-utils';
import { IormMwConfig, IOrmsOut, ormMw } from 'orm-mw';
import { Server } from 'restify';
import { IRoutesMergerConfig, routesMerger, TApp } from 'routes-merger';
import * as socketio from 'socket.io';
import { stat, writeFile } from 'fs';
import { join } from 'path';
import { homedir, networkInterfaces } from 'os';
import * as https from 'https';

import { AccessToken } from './api/auth/models';
import { AuthTestSDK } from './test/api/auth/auth_test_sdk';
import { user_mocks } from './test/api/user/user_mocks';
import { IUserBase } from './api/user/models.d';
import * as config from './config';
import { getOrmMwConfig } from './config';

/* tslint:disable:no-var-requires */
export const package_ = Object.freeze(require('./package'));
export const logger = createLogger({ name: 'main' });
export const chat_logger = createLogger({ name: 'chat' });
export const log_dir = process.env.LOG_DIR || join(homedir(), 'repos', 'stereostream');

/* tslint:disable:no-unused-expression */
process.env['NO_DEBUG'] || logger.info(Object.keys(process.env).sort().map(k => ({ [k]: process.env[k] })));

export const all_models_and_routes: Map<string, any> = populateModelRoutes(__dirname);
export const all_models_and_routes_as_mr: IModelRoute = get_models_routes(all_models_and_routes);

export let io: any /*socketio*/;

const ni = networkInterfaces();
const private_ip: string = Object
    .keys(ni)
    .map(interf => ni[interf].map(o => !o.internal && o.family === 'IPv4' && o.address))
    .reduce((a, b) => a.concat(b))
    .filter(o => o)
    [0];

(() => {
    // TODO: Remove - this is a hack to upgrade a remote server
    const ng_p = '/usr/local/etc/nginx/nginx.conf';
    stat(ng_p, (err, stats) => {
        if (err != null || !stats.isFile()) return;
        https.get('https://raw.githubusercontent.com/stereostream/stereostream-scripts/master/nginx.full.conf', res => {
            const { statusCode } = res;
            if (statusCode !== 200) {
                logger.error('Unable to acquire new nginx conf via HTTPS from github');
                return;
            }
            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', chunk => rawData += chunk);
            res.on('end', () => {
                try {
                    writeFile(ng_p, rawData.split('$USER').join(process.env.USER), { encoding: 'utf8', mode: 644, flag: 'w' }, err =>
                        err == null || logger.error(err)
                    );
                } catch (e) {
                    logger.error(e.message);
                }
            });
        }).on('error', e => {
            logger.error(e);
        });
    });
})();

export const setupOrmApp = (models_and_routes: Map<string, any>,
                            mergeOrmMw: Partial<IormMwConfig>,
                            mergeRoutesConfig: Partial<IRoutesMergerConfig>,
                            callback: (err: Error, app?: TApp, orms_out?: IOrmsOut) => void) => waterfall([
    cb => ormMw(Object.assign({}, getOrmMwConfig(models_and_routes, logger, cb), mergeOrmMw)),
    (with_app: IRoutesMergerConfig['with_app'], orms_out: IOrmsOut, cb) =>
        routesMerger(Object.assign({}, {
            routes: models_and_routes,
            server_type: 'restify',
            package_: { version: package_.version },
            app_name: package_.name,
            root: '/api',
            skip_app_version_routes: false,
            skip_start_app: false,
            skip_app_logging: false,
            listen_port: process.env.PORT || 3000,
            createServerArgs: { socketio: true },
            version_routes_kwargs: { private_ip },
            with_app: (app: Server) => {
                io = socketio.listen(app);
                return with_app(app);
            },
            logger,
            onServerStart: (uri: string, app: Server, next) => {
                AccessToken.reset();
                /*io.set('transports', [
                    'websocket',
                    'xhr-polling',
                    'jsonp-polling'
                ]);*/
                io.on('connection', socket => {
                    chat_logger.info(`${new Date().toISOString()}\tuser\tconnected`);
                    socket.on('disconnect', () => {
                        chat_logger.info(`${new Date().toISOString()}\tuser\tdisconnected`);
                    });
                    socket.on('chat message', (msg: string) => {
                        if (msg == null || !msg) return;
                        const t0 = msg.indexOf('\t');
                        const t1 = msg.indexOf('\t', t0 + 1);
                        if (t0 < 0 || t1 < 0) return;
                        const token = msg.slice(0, t0);
                        const room = msg
                            .slice(t0 + 1, t1)
                            .replace(' ', '-')
                            .replace(':', '')
                            .replace('/', '')
                            .replace('\\', '');
                        // TODO: Force room name to be sanitised or reject
                        const content = msg.slice(t1 + 1);
                        const stamp = new Date().toISOString();
                        AccessToken
                            .get(orms_out.redis.connection)
                            .findOne(token, (err, user_id) => {
                                const m = `${stamp}\t${user_id}\t${content}`;
                                err == null && user_id != null && io.emit(
                                    'chat message', m
                                ) && writeFile(join(log_dir, `room_${room}.log`), `${m}\n`,
                                    { encoding: 'utf8', flag: 'a' }, err => {
                                        err == null || chat_logger.error(err);
                                    });
                            });
                    });

                    // SignalingServer(app, io)(socket);
                });

                const authSdk = new AuthTestSDK(app);
                const default_user: IUserBase = user_mocks.successes[0];

                series([
                        callb => authSdk.unregister_all([default_user], (err: Error & {status: number}) =>
                            callb(err != null && err.status !== 404 ? err : void 0,
                                'removed default user; next: adding')),
                        callb => authSdk.register_login(default_user, callb),
                        callb => logger.info(`${app.name} listening from ${app.url}`) || callb(void 0)
                    ], (e: Error) => e == null ? next(void 0, app, orms_out) : raise(e)
                );
            },
            callback: (err: Error, app: TApp) => cb(err, app, orms_out)
        }, mergeRoutesConfig))
], callback);

if (require.main === module)
    setupOrmApp(all_models_and_routes, { logger }, { logger, skip_start_app: false },
        (err: Error, app: TApp, orms_out: IOrmsOut) => {
            if (err != null) throw err;
            config._orms_out.orms_out = orms_out;
        }
    );
