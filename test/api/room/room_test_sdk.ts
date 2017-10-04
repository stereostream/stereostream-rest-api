import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiJsonSchema from 'chai-json-schema';
import { IncomingMessageError, sanitiseSchema, superEndCb, TCallback } from 'nodejs-utils';
import * as supertest from 'supertest';
import { Response } from 'supertest';

import { IRoom } from '../../../api/room/models.d';
import * as room_route from '../../../api/room/route';
import * as room_routes from '../../../api/room/routes';
import { User } from '../../../api/user/models';

/* tslint:disable:no-var-requires */
const user_schema = sanitiseSchema(require('./../user/schema.json'), User._omit);
const room_schema = require('./schema.json');

chai.use(chaiJsonSchema);

export class RoomTestSDK {
    constructor(public app) {
    }

    public create(access_token: string, room: IRoom,
                  callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('`access_token` argument to `create` must be defined'));
        else if (room == null) return callback(new TypeError('`room` argument to `create` must be defined'));

        expect(room_route.create).to.be.an.instanceOf(Function);
        supertest(this.app)
            .post(`/api/room/${room.name}`)
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect('Content-Type', /json/)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err);
                else if (res.error != null) return superEndCb(callback)(res.error);

                try {
                    expect(res.status).to.be.equal(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.jsonSchema(room_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public getAll(access_token: string, room: IRoom,
                  callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('`access_token` argument to `getAll` must be defined'));
        else if (room == null) return callback(new TypeError('`room` argument to `getAll` must be defined'));

        expect(room_routes.read).to.be.an.instanceOf(Function);
        supertest(this.app)
            .get('/api/room')
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err);
                else if (res.error != null) return superEndCb(callback)(res.error);
                try {
                    expect(res.body).to.have.property('owner');
                    expect(res.body).to.have.property('rooms');
                    expect(res.body.rooms).to.be.instanceOf(Array);
                    res.body.rooms.map(_room => {
                        expect(_room).to.be.an('object');
                        expect(_room).to.be.jsonSchema(room_schema);
                    });
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public retrieve(access_token: string, room: IRoom,
                    callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null) return callback(new TypeError('`access_token` argument to `getAll` must be defined'));
        else if (room == null) return callback(new TypeError('`room` argument to `getAll` must be defined'));

        expect(room_route.read).to.be.an.instanceOf(Function);
        console.info('`/api/room/${room.name}` =', `/api/room/${room.name}`)
        supertest(this.app)
            .get(`/api/room/${room.name}`)
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err);
                else if (res.error != null) return superEndCb(callback)(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.be.jsonSchema(room_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public update(access_token: string, initial_room: IRoom,
                  updated_room: IRoom, callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null)
            return callback(new TypeError('`access_token` argument to `update` must be defined'));
        else if (initial_room == null)
            return callback(new TypeError('`initial_room` argument to `update` must be defined'));
        else if (updated_room == null)
            return callback(new TypeError('`updated_room` argument to `update` must be defined'));
        else if (initial_room.owner !== updated_room.owner)
            return callback(
                new ReferenceError(`${initial_room.owner} != ${updated_room.owner} (\`owner\`s between rooms)`)
            );

        expect(room_route.update).to.be.an.instanceOf(Function);
        supertest(this.app)
            .put(`/api/room/${initial_room.name}`)
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .send(updated_room)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err);
                else if (res.error != null) return superEndCb(callback)(res.error);
                try {
                    expect(res.body).to.be.an('object');
                    Object.keys(updated_room).map(
                        attr => expect(updated_room[attr]).to.be.equal(res.body[attr])
                    );
                    expect(res.body).to.be.jsonSchema(room_schema);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }

    public destroy(access_token: string, room: IRoom,
                   callback: TCallback<Error | IncomingMessageError, Response>) {
        if (access_token == null)
            return callback(new TypeError('`access_token` argument to `destroy` must be defined'));
        else if (room == null)
            return callback(new TypeError('`room` argument to `destroy` must be defined'));

        expect(room_route.del).to.be.an.instanceOf(Function);
        supertest(this.app)
            .del(`/api/room/${room.name}`)
            .set('Connection', 'keep-alive')
            .set('X-Access-Token', access_token)
            .end((err, res: Response) => {
                if (err != null) return superEndCb(callback)(err);
                else if (res.error != null) return superEndCb(callback)(res.error);
                try {
                    expect(res.status).to.be.equal(204);
                } catch (e) {
                    err = e as Chai.AssertionError;
                } finally {
                    superEndCb(callback)(err, res);
                }
            });
    }
}
