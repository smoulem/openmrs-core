/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrs.test.jupiter;

import org.openmrs.api.OpenmrsApplicationContextConfig;
import org.openmrs.test.TestingApplicationContextConfig;
import org.springframework.test.context.ContextConfiguration;

/**
 * Modules using the unit test framework should use this class instead of the general
 * {@link BaseContextSensitiveTest} one. Developers just need to make sure their modules are on the
 * classpath; annotation-based component scanning discovers module configuration classes. Use this
 * class for Junit 5 tests.
 *
 * @since 2.9.0
 */
@ContextConfiguration(classes = { OpenmrsApplicationContextConfig.class,
        TestingApplicationContextConfig.class }, inheritLocations = false)
public abstract class BaseModuleContextSensitiveNonTransactionalTest extends BaseContextSensitiveNonTransactionalTest {

}
