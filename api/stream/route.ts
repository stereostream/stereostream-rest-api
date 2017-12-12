import * as fs from 'fs';
import * as path from 'path';

import * as restify from 'restify';

import { IOrmReq } from 'orm-mw';
import * as mime from 'mime-types';
import { fmtError, NotFoundError } from 'custom-restify-errors';

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}/:name`,
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const sn = `${namespace}/:name 
                with ${process.env.STREREOSTREAM_BROADAST}${path.sep}${req.params.name}`;
            if (process.env.STREREOSTREAM_BROADAST == null || req.params.name == null)
                return next(new NotFoundError(sn));

            const filePath = path.join(process.env.STREREOSTREAM_BROADAST, req.params.name);
            const ext = path.extname(filePath);

            fs.exists(filePath, exists => {
                if (!exists) {
                    return next(new NotFoundError(sn));
                } else fs.readFile(filePath, (err, contents) => {
                    if (err != null) return next(fmtError(err));
                    else if (!contents) return next(new NotFoundError(sn));
                    else {
                        res.setHeader('Content-Type', mime.lookup(ext) || 'application/octet-stream');
                        res.writeHead(200);

                        /*
                        // Gzip support
                        const ae = req.headers['accept-encoding'] as string;

                        if (ae && ae.match(/\bgzip\b/))
                            zlib.gzip(contents, function(err, zip) {
                                if (err) return next(err);

                                res.end(zip);
                            })
                        else */
                        res.end(contents, 'utf-8');
                        return next();
                    }
                });
            })
        }
    );
};
