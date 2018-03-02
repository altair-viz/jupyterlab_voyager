FROM frolvlad/alpine-miniconda3:python3.6

RUN conda install -y -c conda-forge yarn
RUN apk add --no-cache bash
RUN conda install -y jupyter
RUN conda install -y -c conda-forge jupyterlab=0.31.10

# build manually b/c `jupyter lab build` cant work with root
# build before adding local files, so that build files are cached
# when we change things here
RUN cd /opt/conda/lib/python3.6/site-packages/jupyterlab/staging && \
    yarn && \
    yarn build:prod

WORKDIR /jupyterlab_voyager
COPY yarn.lock package.json ./
RUN yarn install --frozen-lockfile
VOLUME /jupyterlab_voyager/node_modules

# allow npm prepare commands as root
ENV npm_config_unsafe_perm=true

COPY . .
RUN yarn build
RUN jupyter labextension link --no-build
