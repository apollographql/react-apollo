import * as React from 'react';
import * as renderer from 'react-test-renderer';
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';
import { ApolloError } from 'apollo-client/errors';

declare function require(name: string);

import mockNetworkInterface, {
  mockSubscriptionNetworkInterface,
} from '../../../mocks/mockNetworkInterface';

import {
  // Passthrough,
  ProviderMock,
} from '../../../mocks/components';

import graphql from '../../../../src/graphql';

describe('subscriptions', () => {
  const results = ['James Baxley', 'John Pinkerton', 'Sam Clairidge', 'Ben Coleman'].map(
    name => ({ result: { user: { name } }, delay: 10 })
  );

  it('executes a subscription', (done) => {
    const query = gql`subscription UserInfo { user { name } }`;
    const networkInterface = mockSubscriptionNetworkInterface(
      [{ request: { query }, results: [...results] }]
    );
    const client = new ApolloClient({ networkInterface });
    // XXX fix in apollo-client
    client.subscribe = client.subscribe.bind(client);

    let count = 0;
    @graphql(query)
    class Container extends React.Component<any, any> {
      componentWillMount(){
        expect(this.props.data.loading).toBeTruthy();
      }
      componentWillReceiveProps({ data: { loading, user }}) {
        expect(loading).toBeFalsy();
        if (count === 0) expect(user).toEqual(results[0].result.user);
        if (count === 1) expect(user).toEqual(results[1].result.user);
        if (count === 2) expect(user).toEqual(results[2].result.user);
        if (count === 3) {
          expect(user).toEqual(results[3].result.user);
          done();
        }
        count++;
      }
      render() {
        return null;
      }
    };

    const interval = setInterval(() => {
      networkInterface.fireResult(0);
      if (count > 3) clearInterval(interval);
    }, 50);

    renderer.create(
      <ProviderMock client={client}><Container /></ProviderMock>
    );
  });

});
