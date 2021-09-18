/**
 *  Table definitions for database reports storage.
 *  @author:  yuvarajsomavamshi@gmail.com
 **/

"use strict";

module.exports = (sequelize, DataTypes) => {
  const TaskModel = sequelize.define(
    "Task",
    {
      // below field shd be auto-generated, so no need 2 explicitly define?
      uuid: { type: DataTypes.UUID, primaryKey: true },
      tid: { type: DataTypes.INTEGER, primaryKey: true }, // uuid for test case execution.
      category: { type: DataTypes.STRING(255) }, // an identifier string for a group of related testcases.
      gv: { type: DataTypes.TEXT }, // these 3 fields gw, wh and th respectively...
      wh: { type: DataTypes.TEXT }, //    store the given, when and then fields.
      th: { type: DataTypes.TEXT }, //
      expected: { type: DataTypes.TEXT }, // expected result.
      actual: { type: DataTypes.TEXT }, // actual outcome of execution of testcase.
      result: { type: DataTypes.BOOLEAN }, // test case pass/fail result
      screenshot: { type: DataTypes.STRING(512) }, // Stores the URL of the screenshot, if provided in the payload.
      execTime: { type: DataTypes.INTEGER } // time taken for exec in millis
    },
    {
      tableName: "Task",
      timestamps: false,
      createdAt: false,
      updatedAt: false,
      engine: "InnoDB"
    }
  );
  TaskModel.associate = function (models) {
    TaskModel.belongsTo(models.Summary, { foreignKey: "uuid" });
  };
  return TaskModel;
};
