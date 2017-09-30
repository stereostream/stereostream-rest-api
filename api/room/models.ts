import { Entity, PrimaryColumn } from 'typeorm';

export const _dependencies = ['user'];

@Entity('room_tbl')
export class Room {
    @PrimaryColumn({ type: 'varchar' })
    name: string;

    @PrimaryColumn({ type: 'varchar' })
    owner: string;
}
