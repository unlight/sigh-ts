"use strict";
var FileInfo = (function () {
    function FileInfo(_a) {
        var _b = _a.version, version = _b === void 0 ? 0 : _b, _c = _a.data, data = _c === void 0 ? "" : _c, dtsFile = _a.dtsFile;
        this.version = version;
        this.data = data;
        this.dtsFile = dtsFile;
    }
    return FileInfo;
}());
exports.FileInfo = FileInfo;
//# sourceMappingURL=file-info.js.map