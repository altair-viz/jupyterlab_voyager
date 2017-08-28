# jupyterlab_voyager

[![npm](https://img.shields.io/npm/v/jupyterlab_voyager.svg?style=flat-square)](https://www.npmjs.com/package/jupyterlab_voyager)
[![Travis branch](https://img.shields.io/travis/saulshanabrook/jupyterlab_voyager/master.svg?style=flat-square)](https://travis-ci.org/saulshanabrook/jupyterlab_voyager)

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


Then right click on any `csv` or `json` file click "Open with...", then "Voyager".

## Development

For a development install (requires npm version 4 or later and yarn), do the following in the repository directory:

```bash
yarn install
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
yarn build
jupyter lab build
```

## Future Work

This extension provides a bare minimum integration with Voyager. It would be great to
support features like:

* Save Voyager state in widget, so that when window is reloaded it will preserve what
  you have selected.
* Allow viewing Pandas dataframes in the notebook with Voyager.

*Created using [JupyterLab `extension-cookiecutter-ts`](https://github.com/jupyterlab/extension-cookiecutter-ts)*.