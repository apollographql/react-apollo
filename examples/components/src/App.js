import React from 'react';
import { Query, QueryWith3Props, QueryWith4Props } from 'react-apollo';
import gql from 'graphql-tag';

export const HERO_QUERY = gql`
  query GetCharacter($episode: Episode!) {
    hero(episode: $episode) {
      name
      id
      friends {
        name
        id
        appearsIn
      }
    }
  }
`;

const Character = ({ episode }) => (
  <Query query={HERO_QUERY} variables={{ episode }}>
    {result => {
      if (result.loading) {
        return <div>Loading</div>;
      }
      if (result.error) {
        return (
          <div>
            <h1>ERROR</h1>
            <pre>{result.error.message}</pre>
            <button
              onClick={() => {
                result.refetch({ episode });
              }}
            >
              Refetch
            </button>
          </div>
        );
      }
      const { hero } = result.data;
      return (
        <div>
          {hero && (
            <div>
              <h3>{hero.name}</h3>

              {hero.friends &&
                hero.friends.map(
                  friend =>
                    friend && (
                      <h6 key={friend.id}>
                        {friend.name}:{' '}
                        {friend.appearsIn
                          .map(x => x && x.toLowerCase())
                          .join(', ')}
                      </h6>
                    ),
                )}
              <button
                onClick={() => {
                  result.refetch();
                }}
              >
                Refetch
              </button>
              <button
                onClick={() => {
                  result.refetch({ episode: 'FOOBAR' });
                }}
              >
                Cause Error
              </button>
            </div>
          )}
        </div>
      );
    }}
  </Query>
);

const Character2 = ({ episode }) => (
  <QueryWith4Props
    query={HERO_QUERY}
    variables={{ episode }}
    renderLoading={() => <div>Loading</div>}
    renderError={(error, { refetch }) => (
      <div>
        <h1>ERROR</h1>
        <pre>{error.message}</pre>
        <button
          onClick={() => {
            refetch({ episode });
          }}
        >
          Refetch
        </button>
      </div>
    )}
    renderResult={({ hero }, { refetch }) => (
      <div>
        {hero && (
          <div>
            <h3>{hero.name}</h3>

            {hero.friends &&
              hero.friends.map(
                friend =>
                  friend && (
                    <h6 key={friend.id}>
                      {friend.name}:{' '}
                      {friend.appearsIn
                        .map(x => x && x.toLowerCase())
                        .join(', ')}
                    </h6>
                  ),
              )}
            <button
              onClick={() => {
                refetch();
              }}
            >
              Refetch
            </button>
            <button
              onClick={() => {
                refetch({ episode: 'FOOBAR' });
              }}
            >
              Cause Error
            </button>
          </div>
        )}
      </div>
    )}
  />
);

const Character3 = ({ episode }) => (
  <QueryWith3Props
    query={HERO_QUERY}
    variables={{ episode }}
    renderLoading={() => <div>Loading</div>}
    renderError={(error, { refetch }) => (
      <div>
        <h1>ERROR</h1>
        <pre>{error.message}</pre>
        <button
          onClick={() => {
            refetch({ episode });
          }}
        >
          Refetch
        </button>
      </div>
    )}
    render={({ data: { hero }, refetch }) => (
      <div>
        {hero && (
          <div>
            <h3>{hero.name}</h3>

            {hero.friends &&
              hero.friends.map(
                friend =>
                  friend && (
                    <h6 key={friend.id}>
                      {friend.name}:{' '}
                      {friend.appearsIn
                        .map(x => x && x.toLowerCase())
                        .join(', ')}
                    </h6>
                  ),
              )}
            <button
              onClick={() => {
                refetch();
              }}
            >
              Refetch
            </button>
            <button
              onClick={() => {
                refetch({ episode: 'FOOBAR' });
              }}
            >
              Cause Error
            </button>
          </div>
        )}
      </div>
    )}
  />
);

const Character4 = ({ episode }) => (
  <QueryWith3Props
    query={HERO_QUERY}
    variables={{ episode }}
    renderLoading={() => <div>Loading</div>}
    render={({ data: { hero }, error, refetch }) =>
      error ? (
        <div>
          <h1>ERROR</h1>
          <pre>{error.message}</pre>
          <button
            onClick={() => {
              refetch({ episode });
            }}
          >
            Refetch
          </button>
        </div>
      ) : (
        <div>
          {hero && (
            <div>
              <h3>{hero.name}</h3>

              {hero.friends &&
                hero.friends.map(
                  friend =>
                    friend && (
                      <h6 key={friend.id}>
                        {friend.name}:{' '}
                        {friend.appearsIn
                          .map(x => x && x.toLowerCase())
                          .join(', ')}
                      </h6>
                    ),
                )}
              <button
                onClick={() => {
                  refetch();
                }}
              >
                Refetch
              </button>
              <button
                onClick={() => {
                  refetch({ episode: 'FOOBAR' });
                }}
              >
                Cause Error
              </button>
            </div>
          )}
        </div>
      )
    }
  />
);

export const App = () => (
  <div>
    <h1>API with children render prop</h1>
    <Character episode="EMPIRE" />
    <h1>API with renderLoading, renderError, renderResult and render props</h1>
    <Character2 episode="EMPIRE" />
    <h1>API with renderLoading, renderError, render (using all props)</h1>
    <Character3 episode="EMPIRE" />
    <h1>
      API with renderLoading, renderError, render (using only renderLoading and
      render)
    </h1>
    <Character4 episode="EMPIRE" />
  </div>
);
