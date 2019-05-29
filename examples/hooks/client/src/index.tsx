import React from 'react';
import ReactDOM from 'react-dom';
import { ApolloClient } from 'apollo-client';
import { getMainDefinition } from 'apollo-utilities';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloLink, split } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { WebSocketLink } from 'apollo-link-ws';
import { ApolloProvider } from '@apollo/react-hooks';
import { Container, Row, Col } from 'reactstrap';
import { OperationDefinitionNode } from 'graphql';

import { LatestNews } from './LatestNews';
import { RocketInventoryList } from './RocketInventoryList';
import { RocketDetail } from './RocketDetail';
import { NewRocketForm } from './NewRocketForm';

const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql'
});

const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4000/graphql',
  options: {
    reconnect: true
  }
});

const terminatingLink = split(
  ({ query }) => {
    const { kind, operation } = getMainDefinition(
      query
    ) as OperationDefinitionNode;
    return kind === 'OperationDefinition' && operation === 'subscription';
  },
  wsLink,
  httpLink
);

const link = ApolloLink.from([terminatingLink]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

function App() {
  return (
    <Container className="app mt-4 mb-4”">
      <Row>
        <Col sm="12">
          <h1>
            Apollo Dealer Network{' '}
            <span role="img" aria-label="rocket">
              🚀
            </span>
          </h1>
          <h2>Helping people go places - fast.</h2>
          <hr />
        </Col>
      </Row>
      <LatestNews />
      <RocketInventoryList />
      <RocketDetail rocketId={1} />
      <NewRocketForm />
    </Container>
  );
}

// These components are used by the useQueryLoader() hook
function Loader() {
  return <div>Loading...</div>;
}
function ErrorMessage({ errorObject }: { errorObject: Error }) {
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd ? 'An internal error occurred' : errorObject.message;
  if (!isProd) {
    console.log('Apollo GraphQL error: ', errorObject);
  }
  return <div>{message}</div>;
}

const options = {
  defaultLoadingComponent: Loader,
  defaultErrorComponent: ErrorMessage
};

ReactDOM.render(
  <ApolloProvider client={client} options={options}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
);
