export class FileInfo {

	public version: number;
	public data: string;
	public dtsFile: string;

	constructor({version = 0, data = "", dtsFile}) {
		this.version = version;
		this.data = data;
		this.dtsFile = dtsFile;
	}
}

export type FileInfoDictionary = { [path: string]: FileInfo };
