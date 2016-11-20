export interface SighEvent {
    initPhase: boolean;
    path: string;
    opTreeIndex: number;
    basePath: string;
    data: string;
    fileType: string;
    type: 'remove' | 'add' | 'change';
    changeFileSuffix: (targetSuffix: string) => void;
    applySourceMap: (sourceMap: any) => void;
}
