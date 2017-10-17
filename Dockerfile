FROM jupyter/minimal-notebook:281505737f8a
RUN conda install -y -c anaconda-platform yarnpkg=0.27.5
RUN conda install -y jupyterlab=0.28.0


COPY --chown=jovyan:users yarn.lock package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts && yarn cache clean
VOLUME /home/jovyan/node_modules

COPY --chown=jovyan:users . .
RUN jupyter labextension link --no-build .
