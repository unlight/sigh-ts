var glob, write, debounce;
var babel, ava;

module.exports = function (pipelines) {
    pipelines["build"] = [
        glob({ basePath: "src" }, "*.js"),
        babel(),
        write("lib"),
        debounce(3000),
        ava({ files: "test/*.js", source: "src/*.js", verbose: true, serial: true })
    ];
}