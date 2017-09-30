import { GenericError } from 'custom-restify-errors';
import { IOrmReq } from 'orm-mw';
import * as restify from 'restify';

export const name_owner_split_mw = (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
    if (req.params.name_owner == null || req.params.name_owner.indexOf('_') < 0)
        return next(new GenericError({
            name: 'ValidationError',
            error: 'ValidationError',
            error_message: 'Parameter missing of form: `{name}_{owner}`',
            statusCode: 400
        }));
    [req.params.name, req.params.owner] = req.params.name_owner.split('_');
    return next();
};
