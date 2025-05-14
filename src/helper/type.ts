import { QueryTypes, Op } from 'sequelize';

export function tipe(data:any) {
    return { replacements: data, type: QueryTypes.SELECT };
}
