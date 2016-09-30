import React from 'react';
import gql from 'graphql-tag';
import { graphql } from '../../../lib/src';

// The data prop, which is provided by the wrapper below contains,
// a `loading` key while the query is in flight and posts when it is ready
export const Articles = ({ data: { loading, content } }) => {
  if (loading) return <div>Loading</div>;
  return (
    <div>
      {content && content.map((article, key) => (
        <div key={key}>
          <h3>{article.title}</h3>
          <p>{article.meta.summary}</p>
        </div>
      ))}
    </div>
  );
}

export const ARTICLE_QUERY = gql`
  query GetArticles {
    content(channel:"articles", limit:3) {
      title
      meta {
        summary
      }
    }
  }
`;

// The `graphql` wrapper executes a GraphQL query and makes the results
// available on the `data` prop of the wrapped component (Articles here)
export const withArticles = graphql(ARTICLE_QUERY);

export default withArticles(Articles);
