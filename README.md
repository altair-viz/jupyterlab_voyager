# jupyterlab_voyager

A JupyterLab MIME renderer extension to view data in the datavoyager.


## Prerequisites

* JupyterLab

## Installation

```bash
jupyter labextension install jupyterlab_voyager
```

## Development

For a development install (requires npm version 4 or later), do the following in the repository directory:

```bash
npm install
jupyter labextension link .
```

To rebuild the package and the JupyterLab app:

```bash
npm run build
jupyter lab build
```

