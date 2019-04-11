FROM cypress/base

# USER root
ENV PATH /node_modules/.bin:$PATH

RUN npm install cypress@3.2.0
RUN cypress verify
