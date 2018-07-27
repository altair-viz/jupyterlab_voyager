FROM jupyter/minimal-notebook:c54800018c2c
RUN conda install -y -c anaconda-platform yarnpkg=1.3.2 && conda clean -tipsy



COPY --chown=jovyan:users yarn.lock package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts && yarn cache clean
VOLUME /home/jovyan/node_modules

COPY --chown=jovyan:users . .
RUN jupyter labextension link --no-build .
