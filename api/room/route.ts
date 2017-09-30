import { series } from 'async';
import { fmtError, NotFoundError, restCatch } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw, mk_valid_body_mw_ignore } from 'restify-validators';
import { JsonSchema } from 'tv4';

import { has_auth } from './../auth/middleware';
import { name_owner_split_mw } from './middleware';
import { Room } from './models';

/* tslint:disable:no-var-requires */
const room_schema: JsonSchema = require('./../../test/api/room/schema');

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}/:name_owner`, has_auth(), name_owner_split_mw,
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            req.getOrm().typeorm.connection
                .getRepository(Room)
                .findOne({ name: req.params.name, owner: req['user_id'] /* req.params.owner */ })
                .then((room: Room) => {
                    if (room == null) return next(new NotFoundError('Room'));
                    // map(room.stocks, (stock, cb) => {}
                    // console.info('room =', room, ';');
                    res.json(200, room);
                    return next();
                })
                .catch(restCatch(req, res, next));
        }
    );
};

export const update = (app: restify.Server, namespace: string = ''): void => {
    app.put(`${namespace}/:name_owner`, has_body, mk_valid_body_mw(room_schema, false),
        mk_valid_body_mw_ignore(room_schema, ['Missing required property']), has_auth(), name_owner_split_mw,
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const roomR = req.getOrm().typeorm.connection.getRepository(Room);

            // TODO: Transaction
            series([
                cb =>
                    roomR
                        .update({ name: req.params.name, owner: req['user_id'] }, req.body)
                        .then(() => cb(void 0))
                        .catch(cb),
                cb =>
                    roomR
                        .findOne(req.body)
                        .then(room => {
                            if (room == null) return cb(new NotFoundError('Room'));
                            return cb();
                        })
                        .catch(cb)
            ], error => {
                if (error != null) return next(fmtError(error));
                res.json(200, req.body);
                return next();
            });
        }
    );
};

export const del = (app: restify.Server, namespace: string = ''): void => {
    app.del(`${namespace}/:name_owner`, has_auth(), name_owner_split_mw,
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            req.getOrm().typeorm.connection
                .getRepository(Room)
                .remove({ owner: req['user_id'], name: req.params.name } as any)
                .then(() => {
                    res.send(204);
                    return next();
                })
                .catch(restCatch(req, res, next));
        }
    );
};
