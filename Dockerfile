FROM continuumio/miniconda3
RUN conda update -y -n base conda
RUN conda install -y -c conda-forge \
    yarn=1.3.2 \
    jupyterlab=0.31.10 \
    notebook=5.4.0 \
&& conda clean -tipsy

WORKDIR /jupyterlab_voyager
COPY yarn.lock package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts && yarn cache clean
VOLUME /jupyterlab_voyager/node_modules

COPY . .
RUN jupyter labextension link --no-build .
