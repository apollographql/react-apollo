import React from 'react';
import Character from './Character';
import { Episode } from './__generated__/types';

export const App = () => <Character episode={Episode.NEWHOPE} />;
