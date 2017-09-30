import { IRoom } from '../../../api/room/models.d';
import { IUserBase } from '../../../api/user/models.d';
import { user_mocks_subset } from './test_room_api';

export const room_mocks: (users: IUserBase[]) => {successes: IRoom[], failures: Array<{}>} =
    (users: IUserBase[]) => ({
        failures: [
            {},
            { email: 'foo@bar.com ' },
            { password: 'foo ' },
            { email: 'foo@bar.com', password: 'foo', bad_prop: true }
        ],
        successes: ((ob: IRoom[] = []) => [
            `can ${Math.random()} count`, `can ${Math.random()} count`
        ].forEach(msg => ((date: Date) =>
            users.forEach((user: IUserBase, idx: number) => ob.push({
                name: user.email,
                owner: users[idx === 0 ? 1 : 0].email
            } as IRoom)))(new Date())
        ) || ob)() as IRoom[]
    });

if (require.main === module) {
    /* tslint:disable:no-console */
    console.info(room_mocks(user_mocks_subset));
}
