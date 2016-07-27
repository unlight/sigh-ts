var glob, babel, write;
var ava;

module.exports = function (pipelines) {
    pipelines["build"] = [
        glob({ basePath: "src" }, "*.js"),
        babel(),
        write("lib"),
        ava({ files: "test/*.js", source: "src/*.js", verbose: true })
    ];
}