import { fireEvent, render, screen } from '@testing-library/react';
import StudyRow from '../../src/components/StudyRow.jsx';

describe('StudyRow', () => {
  test('cycles the study phrase through Korean and English', () => {
    render(
      <table>
        <tbody>
          <StudyRow
            row={{ id: 1, word: '猫', translation: '고양이', translation2: 'cat' }}
            onUpdateCell={jest.fn()}
            onSaveRow={jest.fn()}
            onDelete={jest.fn()}
            onAddImage={jest.fn()}
            onCellKeyDown={jest.fn()}
          />
        </tbody>
      </table>
    );

    const flipToKorean = screen.getByRole('button', { name: 'Show Korean' });
    const activePhrase = () => document.querySelector('.study-flip-front .editable-cell-content').textContent;
    expect(activePhrase()).toBe('猫');
    fireEvent.click(flipToKorean);
    fireEvent.transitionEnd(document.querySelector('.study-flip-front'), {
      propertyName: 'transform'
    });

    expect(activePhrase()).toBe('고양이');
    fireEvent.click(screen.getByRole('button', { name: 'Show English' }));
    fireEvent.transitionEnd(document.querySelector('.study-flip-front'), {
      propertyName: 'transform'
    });

    expect(activePhrase()).toBe('cat');
    fireEvent.click(screen.getByRole('button', { name: 'Show Japanese' }));
    fireEvent.transitionEnd(document.querySelector('.study-flip-front'), {
      propertyName: 'transform'
    });

    expect(activePhrase()).toBe('猫');
  });
});