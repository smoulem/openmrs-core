/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrs;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

import org.hibernate.envers.Audited;

/**
 * FieldType
 */
@Audited
@Entity
@Table(name = "field_type")
@AttributeOverrides({ @AttributeOverride(name = "name", column = @Column(name = "name", length = 50)),
        @AttributeOverride(name = "description", column = @Column(name = "description", length = 2147483647)) })
public class FieldType extends BaseChangeableOpenmrsMetadata {

	public static final long serialVersionUID = 35467L;

	// Fields

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "field_type_id")
	private Integer fieldTypeId;

	@Column(name = "is_set", nullable = false)
	private Boolean isSet = false;

	@Transient
	private Boolean retired;

	@Transient
	private java.util.Date dateRetired;

	@Transient
	private User retiredBy;

	@Transient
	private String retireReason;

	@Transient
	private User changedBy;

	@Transient
	private java.util.Date dateChanged;

	// Constructors

	/** default constructor */
	public FieldType() {
	}

	/** constructor with id */
	public FieldType(Integer fieldTypeId) {
		this.fieldTypeId = fieldTypeId;
	}

	// Property accessors

	/**
	 * @return Returns the fieldTypeId.
	 */
	public Integer getFieldTypeId() {
		return fieldTypeId;
	}

	/**
	 * @param fieldTypeId The fieldTypeId to set.
	 */
	public void setFieldTypeId(Integer fieldTypeId) {
		this.fieldTypeId = fieldTypeId;
	}

	/**
	 * @return Returns the isSet.
	 */
	public Boolean getIsSet() {
		return isSet;
	}

	/**
	 * @param isSet The isSet to set.
	 */
	public void setIsSet(Boolean isSet) {
		this.isSet = isSet;
	}

	/**
	 * @since 1.5
	 * @see org.openmrs.OpenmrsObject#getId()
	 */
	@Override
	public Integer getId() {

		return getFieldTypeId();
	}

	/**
	 * @since 1.5
	 * @see org.openmrs.OpenmrsObject#setId(java.lang.Integer)
	 */
	@Override
	public void setId(Integer id) {
		setFieldTypeId(id);

	}

}
