"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = logdiagnostics;

var _typescript = require("typescript");

var _typescript2 = _interopRequireDefault(_typescript);

var _sighCore = require("sigh-core");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function logdiagnostics(diagnostics) {
    diagnostics.forEach(function (d) {
        var message = _typescript2.default.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var _d$file$getLineAndCha = d.file.getLineAndCharacterOfPosition(d.start);

            var line = _d$file$getLineAndCha.line;
            var character = _d$file$getLineAndCha.character;

            var lineText = d.file.fileName + ":" + (line + 1) + ":" + (character + 1);
            message = lineText + " " + message;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            _sighCore.log.warn(message);
        } else {
            (0, _sighCore.log)(message);
        }
    });
}
//# sourceMappingURL=logdiagnostics.js.map