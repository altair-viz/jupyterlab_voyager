FROM cypress/base

# USER root
ENV PATH /node_modules/.bin:$PATH

RUN npm install cypress@1.0.3
RUN cypress verify

