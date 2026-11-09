/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrs.security;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;

@Configuration
public class PasswordEncoderConfig {

	@Bean
	public LegacyOpenmrsPasswordEncoder openmrsLegacyPasswordEncoder() {
		return new LegacyOpenmrsPasswordEncoder();
	}

	@Bean
	public Argon2PasswordEncoder argon2PasswordEncoder(@Value("${security.argon2.parallelism:1}") String parallelism,
	        @Value("${security.argon2.memory:19456}") String memory,
	        @Value("${security.argon2.iterations:2}") String iterations) {
		return new Argon2PasswordEncoder(16, 32, Argon2WorkFactors.parallelism(parallelism),
		        Argon2WorkFactors.memory(memory), Argon2WorkFactors.iterations(iterations));
	}

	@Bean
	public OpenmrsDelegatingPasswordEncoder openmrsPasswordEncoder(@Value("${security.passwordEncoder:}") String encoder,
	        Argon2PasswordEncoder argon2PasswordEncoder, LegacyOpenmrsPasswordEncoder openmrsLegacyPasswordEncoder) {
		return new OpenmrsDelegatingPasswordEncoder(encoder, Map.of("argon2", argon2PasswordEncoder),
		        openmrsLegacyPasswordEncoder);
	}
}
