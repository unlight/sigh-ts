export declare class FileInfo {
    version: number;
    data: string;
    dtsFile: string;
    constructor({version, data, dtsFile}: {
        version?: number;
        data?: string;
        dtsFile: any;
    });
}
export declare type FileInfoDictionary = {
    [path: string]: FileInfo;
};
