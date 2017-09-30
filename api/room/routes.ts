import { NotFoundError, restCatch } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';
import { has_body, mk_valid_body_mw } from 'restify-validators';
import { JsonSchema } from 'tv4';

import { has_auth } from '../auth/middleware';
import { Room } from './models';

/* tslint:disable:no-var-requires */
const room_schema: JsonSchema = require('./../../test/api/room/schema');

export const create = (app: restify.Server, namespace: string = ''): void => {
    const add_owner_mw = (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
        req.body.owner = req['user_id'];
        return next();
    };

    app.post(namespace, has_auth(), has_body, add_owner_mw, mk_valid_body_mw(room_schema),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const room = new Room();
            room.name = req.body.name;
            room.owner = req['user_id'];

            req.getOrm().typeorm.connection.manager
                .save(room)
                .then((room_obj: Room) => {
                    if (room_obj == null) return next(new NotFoundError('Room'));
                    res.json(201, room_obj);
                    return next();
                })
                .catch(restCatch(req, res, next));
        }
    );
};

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(namespace, has_auth(),
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            req.getOrm().typeorm.connection
                .getRepository(Room)
                .find({ owner: req['user_id'] })
                .then((rooms: Room[]) => {
                    if (rooms == null || !rooms.length) return next(new NotFoundError('Room'));
                    res.json({ rooms, owner: req['user_id'] });
                    return next();
                })
                .catch(restCatch(req, res, next));
        }
    );
};
