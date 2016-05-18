sigh-ts
=======
A sigh plugin to compile typescript files.

EXAMPLE
-------
```js
pipelines["build"] = [
	glob({basePath: "src"}, "**/*.ts"),
	ts(),
	write("dist")
];
```