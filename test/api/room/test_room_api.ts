import * as async from 'async';
import { createLogger } from 'bunyan';
import { IModelRoute, model_route_to_map } from 'nodejs-utils';
import { IOrmsOut, tearDownConnections } from 'orm-mw';
import { basename } from 'path';
import { Server } from 'restify';

import { AccessToken } from '../../../api/auth/models';
import { IRoom } from '../../../api/room/models.d';
import { IUserBase } from '../../../api/user/models.d';
import { _orms_out } from '../../../config';
import { all_models_and_routes_as_mr, setupOrmApp } from '../../../main';
import { create_and_auth_users } from '../../shared_tests';
import { AuthTestSDK } from '../auth/auth_test_sdk';
import { IAuthSdk } from '../auth/auth_test_sdk.d';
import { user_mocks } from '../user/user_mocks';
import { room_mocks } from './room_mocks';
import { RoomTestSDK } from './room_test_sdk';

const models_and_routes: IModelRoute = {
    user: all_models_and_routes_as_mr['user'],
    auth: all_models_and_routes_as_mr['auth'],
    room: all_models_and_routes_as_mr['room']
};

process.env['NO_SAMPLE_DATA'] = 'true';
export const user_mocks_subset: IUserBase[] = user_mocks.successes.slice(20, 30);

const tapp_name = `test::${basename(__dirname)}`;
const logger = createLogger({ name: tapp_name });

describe('Room::routes', () => {
    let sdk: RoomTestSDK;
    let auth_sdk: IAuthSdk;

    let mocks: {successes: IRoom[], failures: Array<{}>};

    before(done =>
        async.waterfall([
                cb => tearDownConnections(_orms_out.orms_out, e => cb(e)),
                cb => AccessToken.reset() || cb(void 0),
                cb => setupOrmApp(
                    model_route_to_map(models_and_routes), { logger },
                    { skip_start_app: true, app_name: tapp_name, logger },
                    cb
                ),
                (_app: Server, orms_out: IOrmsOut, cb) => {
                    _orms_out.orms_out = orms_out;
                    console.info('orms_out =', orms_out, ';');
                    mocks = room_mocks(user_mocks_subset);

                    auth_sdk = new AuthTestSDK(_app);
                    sdk = new RoomTestSDK(_app);

                    return cb(void 0);
                },
                cb => create_and_auth_users(user_mocks_subset, auth_sdk, cb)
            ],
            done
        )
    );

    // Deregister database adapter waterline_c
    after('unregister all users', done => auth_sdk.unregister_all(user_mocks_subset, done));
    after('tearDownConnections', done => tearDownConnections(_orms_out.orms_out, done));

    describe('/api/room', () => {
        afterEach('deleteRoom', done => sdk.destroy(user_mocks_subset[0].access_token, mocks.successes[0], done));

        it('POST should create room', done =>
            sdk.create(user_mocks_subset[0].access_token, mocks.successes[0], done)
        );

        it('GET should get all rooms', done => async.series([
                cb => sdk.create(user_mocks_subset[0].access_token, mocks.successes[0], cb),
                cb => sdk.getAll(user_mocks_subset[0].access_token, mocks.successes[0], cb)
            ], done)
        );
    });

    describe('/api/room/:email', () => {
        before('createRoom', done => sdk.create(user_mocks_subset[0].access_token, mocks.successes[1], _ => done()));
        after('deleteRoom', done => sdk.destroy(user_mocks_subset[0].access_token, mocks.successes[1], done));

        it('GET should retrieve room', done =>
            sdk.retrieve(user_mocks_subset[0].access_token, mocks.successes[1], done)
        );

        it('PUT should update room', done =>
            sdk.update(user_mocks_subset[0].access_token, mocks.successes[1],
                {
                    owner: mocks.successes[1].owner,
                    name: `NAME: ${mocks.successes[1].name}`
                } as IRoom, done)
        );

        it('DELETE should destroy room', done =>
            sdk.destroy(user_mocks_subset[0].access_token, mocks.successes[1], done)
        );
    });
});