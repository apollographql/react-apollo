
import * as React from 'react';
import { mount } from 'enzyme';
import { observer } from 'mobx-react';
import { observable } from 'mobx';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';

declare function require(name: string);

import {
  ProviderMock,
} from '../../../mocks/components';
import mockNetworkInterface from '../../../mocks/mockNetworkInterface';


import graphql from '../../../../src/graphql';

describe('mobx integration', () => {

  class AppState {
    @observable first = 0;

    constructor() {
      setInterval(() => {
        if (this.first <= 2) this.first += 1;
      }, 250);
    }

    reset() {
      this.first = 0;
    }
  }

  it('works with mobx', (done) => {
    const query = gql`query people($first: Int) { allPeople(first: $first) { people { name } } }`;
    const data = { allPeople: { people: [ { name: 'Luke Skywalker' } ] } };
    const variables = { first: 0 };

    const data2 = { allPeople: { people: [ { name: 'Leia Skywalker' } ] } };
    const variables2 = { first: 1 };

    const networkInterface = mockNetworkInterface(
      { request: { query, variables }, result: { data } },
      { request: { query, variables: variables2 }, result: { data: data2 } }
    );

    const client = new ApolloClient({ networkInterface });

    @graphql(query, {
      options: (props) => ({ variables: { first: props.appState.first } }),
    })
    @observer
    class Container extends React.Component<any, any> {
      componentWillReact() {
        if (this.props.appState.first === 1) {
          this.props.data.refetch({ first: this.props.appState.first });
        }
      }
      componentWillReceiveProps(nextProps) {
        if (this.props.appState.first === 1) {
          if (nextProps.data.loading) return;
          expect(nextProps.data.allPeople).toEqual(data2.allPeople);
          done();
        }
      }

      render() {
        return <div>{this.props.appState.first}</div>;
      }
    };

    const appState = new AppState();
    mount(
      <ProviderMock client={client}>
        <Container appState={appState} />
      </ProviderMock>
    ) as any;

  });

});
