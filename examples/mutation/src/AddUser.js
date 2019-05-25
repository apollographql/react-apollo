import React from 'react';
import { Mutation } from '@apollo/react-components';
import gql from 'graphql-tag';

export const ADD_USER = gql`
  mutation create($username: String!) {
    createUser(username: $username) {
      id
      username
    }
  }
`;

export default class AddUser extends React.Component {
  state = {
    username: ''
  };
  render() {
    const { username } = this.state;

    return (
      <Mutation mutation={ADD_USER} variables={{ username }} onError={() => {}}>
        {(addUser, result) => {
          const { data, loading, error, called } = result;

          if (!called) {
            return (
              <div>
                <input
                  placeholder="Username"
                  value={username}
                  onChange={e => this.setState({ username: e.target.value })}
                />
                <button data-testid="add-user-button" onClick={addUser}>
                  Create new user
                </button>
              </div>
            );
          }
          if (loading) {
            return <div>LOADING</div>;
          }
          if (error) {
            return <div>ERROR</div>;
          }

          const { createUser } = data;

          if (createUser) {
            const { username, id } = createUser;

            return <div>{`Created ${username} with id ${id}`}</div>;
          } else {
            return null;
          }
        }}
      </Mutation>
    );
  }
}
