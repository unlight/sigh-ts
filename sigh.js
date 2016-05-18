var glob, babel, write;

module.exports = function(pipelines) {
	pipelines["source"] = [
		glob({basePath: "src"}, "*.js"),
		babel({modules: "common"}),
		write("lib")
	];
}