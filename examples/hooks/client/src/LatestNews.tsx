import React from 'react';
import { Card, CardText, CardBody, CardTitle } from 'reactstrap';
import { useSubscription } from '@apollo/react-hooks';
import gql from 'graphql-tag';

import { News } from './types';

const LATEST_NEWS = gql`
  subscription getLatestNews {
    latestNews {
      content
    }
  }
`;

export function LatestNews() {
  const { loading, data } = useSubscription<News>(LATEST_NEWS);
  return (
    <Card className="bg-light">
      <CardBody>
        <CardTitle>
          <h5>Latest News</h5>
        </CardTitle>
        <CardText>{loading ? 'Loading...' : data!.latestNews.content}</CardText>
      </CardBody>
    </Card>
  );
}
