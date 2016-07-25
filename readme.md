#sigh-ts
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

CHANGELOG
---------
* 0.0.4 (25 Jul 2016) added support `tsconfig.json`
* 0.0.3 (18 May 2016) updated examples
* 0.0.2 (18 May 2016) allow specify all options of typescript
* 0.0.1 (12 Dec 2015) first release  