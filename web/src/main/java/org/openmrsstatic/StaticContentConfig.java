/**
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. OpenMRS is also distributed under
 * the terms of the Healthcare Disclaimer located at http://openmrs.org/license.
 *
 * Copyright (C) OpenMRS Inc. OpenMRS is a registered trademark and the OpenMRS
 * graphic logo is a trademark of OpenMRS Inc.
 */
package org.openmrsstatic;

import java.util.Map;
import java.util.Properties;

import org.openmrs.web.StaticResourceDispatcher;
import org.openmrs.web.controller.PseudoStaticContentController;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.ViewResolver;
import org.springframework.web.servlet.handler.SimpleUrlHandlerMapping;
import org.springframework.web.servlet.view.InternalResourceViewResolver;
import org.springframework.web.servlet.view.JstlView;

@Configuration
public class StaticContentConfig {

	@Bean
	public ViewResolver viewResolver() {
		InternalResourceViewResolver resolver = new InternalResourceViewResolver();
		resolver.setViewClass(JstlView.class);
		resolver.setPrefix("/WEB-INF/view");
		resolver.setSuffix("");
		return resolver;
	}

	@Bean
	public SimpleUrlHandlerMapping handlerMapping(StaticResourceDispatcher staticResourceDispatcher) {
		Properties mappings = new Properties();
		mappings.setProperty("/**", "staticResourceDispatcher");
		SimpleUrlHandlerMapping handlerMapping = new SimpleUrlHandlerMapping();
		handlerMapping.setMappings(mappings);
		return handlerMapping;
	}

	@Bean
	public StaticResourceDispatcher staticResourceDispatcher(
	        @Qualifier("staticContentController") PseudoStaticContentController staticContentController,
	        @Qualifier("jstlContentController") PseudoStaticContentController jstlContentController) {
		StaticResourceDispatcher dispatcher = new StaticResourceDispatcher();
		dispatcher.setStaticContentController(staticContentController);
		dispatcher.setJstlContentController(jstlContentController);
		return dispatcher;
	}

	@Bean
	public Map<String, String> urlRewrites() {
		return Map.of("/scripts/jquery/jquery-1.3.2.min.js", "/scripts/jquery/jquery.min.js",
		    "/scripts/jquery-ui/js/jquery-ui-1.7.2.custom.min.js", "/scripts/jquery-ui/js/jquery-ui.custom.min.js",
		    "/scripts/jquery-ui/css/redmond/jquery-ui-1.7.2.custom.css",
		    "/scripts/jquery-ui/css/redmond/jquery-ui.custom.css");
	}

	@Bean
	public PseudoStaticContentController staticContentController(Map<String, String> urlRewrites) {
		PseudoStaticContentController controller = new PseudoStaticContentController();
		controller.setInterpretJstl(false);
		controller.setRewrites(urlRewrites);
		return controller;
	}

	@Bean
	public PseudoStaticContentController jstlContentController() {
		PseudoStaticContentController controller = new PseudoStaticContentController();
		controller.setInterpretJstl(true);
		return controller;
	}
}
