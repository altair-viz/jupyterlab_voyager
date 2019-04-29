FROM jupyter/minimal-notebook
RUN conda install -y -c conda-forge yarn=1.15.2 && conda clean -tipsy

COPY --chown=jovyan:users yarn.lock package.json ./
RUN yarn install --frozen-lockfile --ignore-scripts && yarn cache clean
VOLUME /home/jovyan/node_modules

COPY --chown=jovyan:users . .
RUN jupyter labextension link .
