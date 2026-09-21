import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PresenceSelector } from '../components/ui';

describe('PresenceSelector', () => {
  it('calls onChange with attendance keys', () => {
    const onChange = jest.fn();
    const view = render(<PresenceSelector value="PRESENT" onChange={onChange} />);
    fireEvent.press(view.getByText('Falta'));
    expect(onChange).toHaveBeenCalledWith('ABSENT');
  });
});
