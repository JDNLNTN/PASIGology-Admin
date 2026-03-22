import React from 'react';
import QuizInfoManager from '../../../components/QuizInfoManager';

export default function BahayNaTisaManage() {
  return (
    <QuizInfoManager
      table="quiz_bnt"
      title="Bahay na Tisa Quiz"
      textField="question"
      textLabel="Question"
      newTextPlaceholder="New question..."
      idField="id"
      sequenceField={null}
      statusField="status"
      approveField="is_approved"
      implementedField="is_implemented"
      // Optional if your columns differ from defaults:
      // incorrect1Field="incorrect1"
      // incorrect2Field="incorrect2"
      // incorrect3Field="incorrect3"
      // correctAnswerField="correct_answer"
    />
  );
}
