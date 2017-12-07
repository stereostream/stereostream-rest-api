import * as fs from 'fs';
import * as path from 'path';

import * as restify from 'restify';

import { IOrmReq } from 'orm-mw';
import * as mime from 'mime-types';

export const read = (app: restify.Server, namespace: string = ''): void => {
    app.get(`${namespace}/:name`,
        (req: restify.Request & IOrmReq, res: restify.Response, next: restify.Next) => {
            const filePath = path.join(process.env.STREREOSTREAM_BROADAST, req.params.name);
            const ext = path.extname(filePath);

            fs.exists(filePath, exists => {
                if (!exists) {
                    res.send(404);
                } else fs.readFile(filePath, (err, contents) => {
                    if (err || !contents) { // Error or empty playlist
                        res.writeHead(500);
                        res.end();
                    }
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
                    }
                });

                return next();
            })
        }
    );
};
