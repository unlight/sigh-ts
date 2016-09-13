import ts from "typescript";
import {log} from "sigh-core";

export default function logdiagnostics(diagnostics) {
    diagnostics.forEach(d => {
        var message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file) {
            var { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
            let lineText = `${d.file.fileName}:${line + 1}:${character + 1}`;
            message = `${lineText} ${message}`;
        }
        message = message.trim();
        if (d.category === 0 || d.category === 1) {
            log.warn(message);
        } else {
            log(message);
        }
    });
}