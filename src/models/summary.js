/**
 *  Table definitions for database reports storage.
 *  @author:  yuvarajsomavamshi@gmail.com
 **/

"use strict";

module.exports = (sequelize, DataTypes) => {
  const SummaryModel = sequelize.define(
    "Summary",
    {
      uuid: { type: DataTypes.UUID, primaryKey: true },
      timestamp: { type: DataTypes.DATE },
      build: { type: DataTypes.INTEGER },
      passed: { type: DataTypes.INTEGER },
      failed: { type: DataTypes.INTEGER },
      skipped: { type: DataTypes.INTEGER },
      fileName: { type: DataTypes.STRING(255) },
      wsIndex: { type: DataTypes.INTEGER },
      execTime: { type: DataTypes.INTEGER }
    },
    {
      tableName: "Summary",
      timestamps: false,
      createdAt: false,
      updatedAt: false,
      engine: "InnoDB"
    }
  );
  SummaryModel.associate = (models) => {
    SummaryModel.hasMany(models.Task, { foreignKey: "uuid" });
  };
  return SummaryModel;
};
