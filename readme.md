# sigh-ts
A sigh plugin to compile typescript files.

EXAMPLE
-------
```js
var globOpts = {
	basePath: "src"
};
pipelines["build"] = [
	glob(globOpts, "**/*.ts"),
	ts(),
	write("dist")
];
```