import React from 'react';
import { ManualQuery } from 'react-apollo';
import gql from 'graphql-tag';

export const HERO_QUERY = gql`
  query getAttendee($query: String!) {
    events(slug: "reacteurope-2018") {
      attendees(q: $query, uuid: "f35ad898-fe07-49cc-bd55-c4fbb59ac1b7") {
        id
        lastName
        email
        firstName
        answers {
          id
          value
          question {
            id
            title
          }
        }
      }
    }
  }
`;

class AttendeesSearch extends React.Component {
  state = {
    query: '',
  };

  render() {
    const { query } = this.state;

    return (
      <ManualQuery query={HERO_QUERY} variables={{ query }}>
        {(load, { loading, error, data, called }) => {
          if (!called) {
            return (
              <div>
                {this._getInput(load)}
                <div>Type in the field to search for your buddies...</div>
              </div>
            );
          }

          if (loading) {
            return <div>'Searching...'</div>;
          }
          if (error) {
            return <div>Error: {error.message}</div>;
          }

          return (
            <div>
              {this._getInput(load)}
              {this._getContentsForData(data)}
            </div>
          );
        }}
      </ManualQuery>
    );
  }

  _getInput = load => {
    const onPressEnter = event => {
      if (event.key === 'Enter') {
        load();
      }
    };
    return (
      <input
        value={this.state.query}
        onKeyPress={onPressEnter}
        onChange={event => this.setState({ query: event.target.value })}
        placeholder="query"
      />
    );
  };

  _getContentsForData = data => {
    const filteredData = fiterData(data);

    if (filteredData.length === 0) {
      return <div>Found no one:((</div>;
    }

    return filteredData.map(entry => (
      <div key={entry.id}>
        <div>Name: {entry.name}</div>
        <div>Email: {entry.email}</div>
      </div>
    ));
  };
}

const fiterData = data => {
  const attendees = data.events[0].attendees;

  return attendees.map(attendee => ({
    id: attendee.id,
    name: attendee.firstName + ' ' + attendee.lastName,
    email: attendee.email,
  }));
};

export const App = () => <AttendeesSearch />;
