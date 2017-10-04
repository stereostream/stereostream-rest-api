import { IRoom } from '../../../api/room/models.d';

export const room_mocks: {successes: IRoom[], failures: Array<{}>} = {
    failures: [
        {},
        { nom: false },
        { name: 'foo', bad_prop: true }
    ],
    successes:
        Array(5)
            .fill(null)
            .map(o => ({ name: `chosen-${Math.floor(Math.random() * 1000)}` })) as any as IRoom[]
};

if (require.main === module) {
    /* tslint:disable:no-console */
    console.info(room_mocks);
}
