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

API
---
```js
ts(options)
```
`options` is key-value object which is 
referencing to [typescript compiler options](http://www.typescriptlang.org/docs/handbook/compiler-options.html)

CHANGELOG
---------
* 0.0.7 (07 Aug 2016) fixed removing declaration files 
* 0.0.6 (06 Aug 2016) allow emit declaration files, log errors
* 0.0.5 (27 Jul 2016) logging and reportDiagnostics option
* 0.0.4 (25 Jul 2016) support `tsconfig.json`
* 0.0.3 (18 May 2016) updated examples
* 0.0.2 (18 May 2016) allow specify all options of typescript
* 0.0.1 (12 Dec 2015) first release