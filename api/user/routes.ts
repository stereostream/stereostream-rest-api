import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { series } from 'async';

import { has_auth } from '../auth/middleware';
import { User } from './models';
import * as user_sdk from './sdk';
import { UserBodyReq, UserBodyUserReq } from './sdk';
import { GenericError } from "custom-restify-errors";
import { RestError } from 'restify-errors';

export const create = (app: restify.Server, namespace: string = '') =>
    app.post(namespace, has_body, mk_valid_body_mw(user_sdk.schema),
        (req: UserBodyReq, res: restify.Response, next: restify.Next) =>
            console.info('req.body =', req.body, ';') || series([
                // TODO: Traverse lifecycle decorators in model then use `.insert()` so we don't need two queries
                cb => req.getOrm().typeorm.connection
                    .getRepository(User)
                    .findOne({ email: req.body.email })
                    .then((user: User) =>
                        user == null ?
                            cb(void 0) : cb(new GenericError({
                                name: 'Exists', error: 'Exists', error_message: 'User exists', statusCode: 400
                            }))
                    )
                    .catch(cb),
                cb => user_sdk.post(req, cb)
            ], (err: Error | RestError, user: User[]) => {
                if (err != null) return next(err);
                res.setHeader('X-Access-Token', user[1].access_token);
                res.json(201, user[1]);
                return next();
            })
    );

export const read = (app: restify.Server, namespace: string = '') =>
    app.get(namespace, has_auth(),
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.get(req, (err, user: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            })
    );

export const update = (app: restify.Server, namespace: string = '') =>
    app.put(namespace, has_auth(), has_body, /*remove_from_body(['email']),
        mk_valid_body_mw(schema, false),
        mk_valid_body_mw_ignore(schema, ['Missing required property']),*/
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.update(req, (err, user: User) => {
                if (err != null) return next(err);
                res.json(user);
                return next();
            })
    );

export const del = (app: restify.Server, namespace: string = '') =>
    app.del(namespace, has_auth(),
        (req: UserBodyUserReq, res: restify.Response, next: restify.Next) =>
            user_sdk.destroy(req, (err, status_code: number) => {
                if (err != null) return next(err);
                res.send(status_code);
                return next();
            })
    );
