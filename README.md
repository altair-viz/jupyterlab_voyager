# jupyterlab_voyager

[![npm](https://img.shields.io/npm/v/jupyterlab_voyager.svg?style=flat-square)](https://www.npmjs.com/package/jupyterlab_voyager)
[![Build
Status](https://travis-ci.org/altair-viz/jupyterlab_voyager.svg?branch=master)](https://travis-ci.org/altair-viz/jupyterlab_voyager)
[![Binder](https://beta.mybinder.org/badge.svg)](https://mybinder.org/v2/gh/altair-viz/jupyterlab_voyager/master?urlpath=lab)

A JupyterLab MIME renderer extension to view CSV and JSON data in [Voyager 2](https://github.com/vega/voyager#voyager-2).

![Screen shot showing data file opened in Voyager in JupyterLab](./screen-shot.png)

## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install jupyterlab_voyager
```

You can also use this with the Docker base images:

```Dockerfile
FROM jupyter/minimal-notebook
RUN jupyter labextension install jupyterlab_voyager
CMD start.sh jupyter lab
```


Then right click on any `csv`, `tsv` or `json` file click "Open with...", then "Voyager".

If you experience 
```"FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory"```
error during installation, you can use 
```bash
- export NODE_OPTIONS=--max-old-space-size=16000
``` 
or just add NODE_OPTIONS=--max-old-space-size=16000 env variable when
running jupyter lab build to solve this problem.

## Development

For a development install (requires npm version 4 or later, yarn, and jupyterlab), do the following in the repository directory:

```bash
yarn install
jupyter labextension link .
```

Then build the files and start Jupyter Lab:

```bash
yarn watch
# in new window
jupyter lab --port=8889 --watch
```

Reload the page to see new code changes.

### Testing

You can run the E2E tests with cypress:

```bash
jupyter lab --port=8889

# in a new window
npx cypress run
```

Or open Cypress for an interactive experience:

```bash
npx cypress open
```

## Docker

If you have Docker version >= 17.09.0-ce installed, you can also do all of the above with:

```bash
docker-compose up lab
```

Then you can run the tests with:

```bash
docker-compose run --rm test
```

If you change the installed packages, you have to remove the existing volume and rebuild the images:

```bash
docker-compose down -v
docker-compose build
```

## Future Work

This extension provides a bare minimum integration with Voyager. It would be great to
support features like:

* Save Voyager state in widget, so that when window is reloaded it will preserve what
  you have selected.
* Allow viewing Pandas dataframes in the notebook with Voyager.

*Created using [JupyterLab `extension-cookiecutter-ts`](https://github.com/jupyterlab/extension-cookiecutter-ts)*.
