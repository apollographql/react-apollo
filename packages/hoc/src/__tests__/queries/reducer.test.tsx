import React from 'react';
import { render, cleanup } from '@testing-library/react';
import gql from 'graphql-tag';
import ApolloClient from 'apollo-client';
import { InMemoryCache as Cache } from 'apollo-cache-inmemory';
import { mockSingleLink, stripSymbols } from '@apollo/react-testing';
import { ApolloProvider } from '@apollo/react-common';
import { DocumentNode } from 'graphql';
import { graphql, ChildProps, DataValue } from '@apollo/react-hoc';

describe('[queries] reducer', () => {
  afterEach(cleanup);

  // props reducer
  it('allows custom mapping of a result to props', done => {
    const query: DocumentNode = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const result = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data: result }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    type Data = typeof result;
    // in case of a skip
    type ChildProps = DataValue<Data>;

    let count = 0;
    const ContainerWithData = graphql<{}, Data, {}, ChildProps>(query, {
      props: ({ data }) => ({ ...data! })
    })(({ getThing, loading }) => {
      count++;
      if (count === 1) expect(loading).toBe(true);
      if (count === 2) {
        expect(getThing).toBeDefined();
        done();
      }
      return null;
    });

    render(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>
    );
  });

  it('allows custom mapping of a result to props that includes the passed props', () => {
    const query: DocumentNode = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const link = mockSingleLink({
      request: { query },
      result: { data: { getThing: { thing: true } } }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Data {
      getThing: { thing: boolean };
    }
    interface Props {
      sample: number;
    }

    type FinalProps = {
      showSpinner: boolean;
    };

    const ContainerWithData = graphql<Props, Data, {}, FinalProps>(query, {
      props: ({ data, ownProps }) => {
        expect(ownProps.sample).toBe(1);
        return { showSpinner: data!.loading };
      }
    })(({ showSpinner }: FinalProps) => {
      expect(showSpinner).toBeTruthy();
      return null;
    });

    render(
      <ApolloProvider client={client}>
        <ContainerWithData sample={1} />
      </ApolloProvider>
    );
  });

  it('allows custom mapping of a result to props 2', done => {
    const query: DocumentNode = gql`
      query thing {
        getThing {
          thing
        }
      }
    `;
    const expectedData = { getThing: { thing: true } };
    const link = mockSingleLink({
      request: { query },
      result: { data: expectedData }
    });
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    interface Data {
      getThing: { thing: boolean };
    }

    interface FinalProps {
      thingy: { thing: boolean };
    }

    const withData = graphql<{}, Data, {}, FinalProps>(query, {
      props: ({ data }) => ({ thingy: data!.getThing! })
    });

    class Container extends React.Component<FinalProps> {
      componentDidUpdate() {
        expect(stripSymbols(this.props.thingy)).toEqual(expectedData.getThing);
        done();
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withData(Container);

    render(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>
    );
  });

  it('passes the prior props to the result-props mapper', done => {
    const query: DocumentNode = gql`
      query thing {
        getThing {
          thing
        }
        other
      }
    `;
    const expectedData = { getThing: { thing: true }, other: false };
    const expectedDataAfterRefetch = { getThing: { thing: true }, other: true };
    const link = mockSingleLink(
      {
        request: { query },
        result: { data: expectedData }
      },
      {
        request: { query },
        result: { data: expectedDataAfterRefetch }
      }
    );
    const client = new ApolloClient({
      link,
      cache: new Cache({ addTypename: false })
    });

    type Data = typeof expectedData;
    interface FinalProps {
      wrapper: { thingy: { thing: boolean } };
      refetch: () => any;
    }

    const withData = graphql<{}, Data, {}, FinalProps>(query, {
      props: ({ data }, lastProps) => {
        const refetch = data!.refetch!;
        let wrapper = { thingy: data!.getThing! };

        // If the current thingy is equal to the last thingy,
        // reuse the wrapper (to preserve referential equality).
        if (lastProps && lastProps.wrapper.thingy === wrapper.thingy) {
          wrapper = lastProps!.wrapper!;
        }

        return { wrapper, refetch };
      }
    });

    let counter = 0;
    class Container extends React.Component<FinalProps> {
      componentDidUpdate(nextProps: FinalProps) {
        expect(stripSymbols(this.props.wrapper.thingy)).toEqual(
          expectedData.getThing
        );
        if (counter === 1) {
          expect(this.props.wrapper).toEqual(nextProps.wrapper);
          done();
        } else {
          counter++;
          this.props.refetch();
        }
      }
      render() {
        return null;
      }
    }

    const ContainerWithData = withData(Container);

    render(
      <ApolloProvider client={client}>
        <ContainerWithData />
      </ApolloProvider>
    );
  });
});
